# This file is correct as-is.
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
urlpatterns = [
    path('health/', views.health, name='health'),

    path('extract/', views.extract_pdf, name='extract'),

    path('compare/', views.compare_pdf_to_html, name='compare_pdf_to_html'),

    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('compare-engagement-letter/', views.compare_engagement_letter, name='compare_engagement_letter'),

    path('compare-pdfs/', views.compare_pdfs, name='compare_pdfs'),
    path('compare-pdf-xml/', views.compare_pdf_to_xml, name='compare_pdf_to_xml'),

    path('htmlpdf/', views.compare_html_to_pdf_with_prompt, name='compare_html_to_pdf_with_prompt'),

    path('compare-contract/', views.compare_contract_to_report, name='compare_contract_to_report'),

    path('customquery/', views.custom_query, name='custom_query'),

    path('extract-from-html/', views.extract_from_html_view, name='extract_from_html'),
    path('extract-photos/', views.extract_photos_view, name='extract_photos'),

    path('save-report/', views.SaveReportView.as_view(), name='save-report'),

    path('get-reports/', views.GetReportsView.as_view(), name='get-reports'),

    path('get-report/<uuid:pk>/', views.GetReportView.as_view(), name='get-report'),

    path('delete-report/<uuid:pk>/', views.DeleteReportView.as_view(), name='delete-report'),

    path('update-report/<uuid:pk>/', views.UpdateReportView.as_view(), name='update-report'),

    path('contact/', views.ContactUsView.as_view(), name='contact_us'),

    path('register/', views.RegisterView.as_view(), name='auth_register'),

    path('login/', auth_views.LoginView.as_view(template_name='api/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('automation/', views.automation_dashboard, name='automation_dashboard'),
    
    path('status', views.get_automation_status, name='get_status'),
    path('files/upload/<str:folder_key>', views.generic_upload_to_folder, name='generic_upload_to_folder'),
    path('files/<str:folder_key>', views.list_generic_files, name='list_generic_files'),
    path('files/<str:folder_key>/download/<str:filename>', views.download_generic_file, name='download_generic_file'),
    path('pause', views.toggle_pause, name='toggle_pause'),
    path('kill', views.kill_automation, name='kill_automation'),
    path('files/logs', views.list_log_files, name='list_log_files'),
    path('logs/active/content', views.get_active_log_content, name='get_active_log_content'),
    path('logs/file/content/<path:filename>', views.get_log_file_content, name='get_log_file_content'),
    path('upload', views.upload_file_automation, name='upload_file_automation'),
    path('start_stored_revised', views.start_stored_revised_automation, name='start_stored_revised_automation'),
    path('start_batch_stored_revised', views.start_batch_stored_revised_automation, name='start_batch_stored_revised_automation'),
    path('start_fastapp', views.start_fastapp_automation_view, name='start_fast_app'),
    path('files/new_revised', views.list_new_revised_files, name='list_new_revised_files'),
    path('files/new_revised/<str:filename>', views.delete_new_revised_file, name='delete_new_revised_file'),
    path('files/old_revised', views.list_old_revised_files, name='list_old_revised_files'),
    path('files/html_ref', views.list_html_files, name='list_html_files'),
    
]