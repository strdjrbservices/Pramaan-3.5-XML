# pyrefly: ignore [missing-import]
from django.contrib.admin import AdminSite
# pyrefly: ignore [missing-import]
from django.shortcuts import render
# pyrefly: ignore [missing-import]
from django.urls import path
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
# pyrefly: ignore [missing-import]
from django.contrib.admin.models import LogEntry

UserModel = get_user_model()

class CustomAdminSite(AdminSite):

    def user_report_view(self, request):
        pending_users = UserModel.objects.filter(is_active=False).count()
        total_users = UserModel.objects.count()
        log_entries = LogEntry.objects.select_related("content_type", "user").order_by("-action_time")

        context = {
            **self.each_context(request),
            'total_users': total_users,
            'pending_users': pending_users,
            'log_entries': log_entries,
        }
        return render(request, 'admin/index.html', context)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('', self.admin_view(self.user_report_view), name='index'),
        ]
        return custom_urls + urls

custom_admin = CustomAdminSite(name='custom_admin')