from typing import Any, Dict
from django.db import models
from django.contrib.auth.models import User
import uuid

class UploadedFile(models.Model):
    """
    Represents a file uploaded by a user.
    """
    objects: models.Manager = models.Manager()
    DoesNotExist: type[Exception]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File '{self.file.name}' uploaded by {self.user.username}"

class AppraisalReport(models.Model):
    """
    Stores the JSON data for a single appraisal report.
    """
    objects: models.Manager = models.Manager()
    DoesNotExist: type[Exception]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_name = models.CharField(max_length=255, blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    report_data: Any = models.JSONField()
    validation_log: Any = models.JSONField(blank=True, null=True)
    status: Any = models.CharField(max_length=50, default='Completed')
    created_at: Any = models.DateTimeField(auto_now_add=True)
    updated_at: Any = models.DateTimeField(auto_now=True)

    def __str__(self):
        """
        Returns a human-readable representation of the report.
        """
        try:
            report_dict = self.report_data if isinstance(self.report_data, dict) else {}
            subject_data = report_dict.get('Subject') or report_dict.get('SUBJECT') or {}

            property_address = subject_data.get('Property Address', 'N/A')
            borrower = subject_data.get('Borrower', 'N/A')
            base_str = f"Report for {property_address} ({borrower})"
            if self.file_name:
                base_str += f" - {self.file_name}"
            created_time = self.created_at.strftime('%Y-%m-%d %H:%M') if hasattr(self.created_at, 'strftime') else str(self.created_at)
            return f"{base_str} created at {created_time}"
        except Exception:
            return f"Report ID: {self.id}"

    class Meta:
        ordering = ['-created_at']


class ContactMessage(models.Model):
    """
    Stores contact form submissions.
    """
    objects: models.Manager = models.Manager()
    DoesNotExist: type[Exception]

    name = models.CharField(max_length=255)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField()
    send_copy = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.name}: {self.subject}"