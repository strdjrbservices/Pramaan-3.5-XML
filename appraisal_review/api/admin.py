from django.contrib import admin
from .models import UploadedFile, AppraisalReport, ContactMessage
from django.utils.safestring import mark_safe
from django.utils.html import escape

@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    """
    Admin view for UploadedFile model.
    """
    list_display = ('user', 'file', 'uploaded_at')
    list_filter = ('user', 'uploaded_at')
    search_fields = ('user__username', 'file')
    readonly_fields = ('uploaded_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(AppraisalReport)
class AppraisalReportAdmin(admin.ModelAdmin):
    """
    Admin interface for viewing Appraisal Reports.
    """
    list_display = ( 'user_name', 'file_name', 'created_at')
    list_filter = ('created_at', 'user_name')
    search_fields = (
        'user_name',
        'file_name',
        'report_data__Subject__Property Address',
        'report_data__Subject__Borrower',
        'report_data__Lender/Client'
    )
    readonly_fields = ('id', 'created_at', 'updated_at', 'pretty_report_data', 'pretty_validation_log')

    fieldsets = (
        (None, {
            'fields': ('id', 'user_name', 'file_name', 'created_at', 'updated_at')
        }),
        ('Report Data', {
            'fields': ('pretty_report_data',),
            'classes': ('collapse',),
        }),
        ('Validation Log', {
            'fields': ('pretty_validation_log',),
            'classes': ('collapse',),
        }),
    )

    def _json_to_table(self, data):
        """
        Recursively converts a dictionary or list to a more readable HTML table/list.
        """
        if isinstance(data, dict):
            html = '<table class="table table-bordered table-sm" style="width: 100%; margin-bottom: 0;">'
            for key, value in data.items():
                html += '<tr>'
                html += f'<th style="vertical-align: top; text-align: left; padding: 4px 8px; background-color: #f8f9fa;">{escape(key)}</th>'
                if isinstance(value, (dict, list)):
                    html += f'<td style="padding: 0;">{self._json_to_table(value)}</td>'
                else:
                    html += f'<td style="padding: 4px 8px; white-space: pre-wrap; word-break: break-word;">{self._json_to_table(value)}</td>'
                html += '</tr>'
            html += '</table>'
            return html
        elif isinstance(data, list):
            if not data: return "[]"
            html = '<ul>'
            for item in data:
                html += f'<li>{self._json_to_table(item)}</li>'
            html += '</ul>'
            return html
        else:
            return escape(str(data) if data is not None else "")

    def pretty_report_data(self, instance):
        """
        Formats the JSONField data into a readable HTML table.
        """
        table_html = self._json_to_table(instance.report_data)
        return mark_safe(f'<div style="max-height: 800px; overflow: auto;">{table_html}</div>')

    pretty_report_data.short_description = 'Report Data'

    def pretty_validation_log(self, instance):
        """
        Formats the validation_log JSON data into a readable HTML table.
        """
        if not instance.validation_log:
            return "-"
        table_html = self._json_to_table(instance.validation_log)
        return mark_safe(f'<div style="max-height: 600px; overflow: auto;">{table_html}</div>')

    pretty_validation_log.short_description = 'Validation Log'

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    """
    Admin view for ContactMessage model.
    """
    list_display = ('name', 'email', 'subject', 'created_at', 'send_copy')
    list_filter = ('created_at', 'send_copy')
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('created_at',)
