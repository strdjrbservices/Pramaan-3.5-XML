from rest_framework import serializers
from django.contrib.auth.models import User
from .models import AppraisalReport, ContactMessage

class AppraisalReportSerializer(serializers.ModelSerializer):
    """
    Serializer for the AppraisalReport model.
    """
    class Meta:
        model = AppraisalReport
        fields = ['id', 'user_name', 'file_name', 'report_data', 'validation_log', 'created_at', 'status']
        read_only_fields = ['id', 'created_at']

class AppraisalReportListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing AppraisalReports with reduced data payload.
    """
    report_data = serializers.SerializerMethodField()

    class Meta:
        model = AppraisalReport
        fields = ['id', 'user_name', 'file_name', 'report_data', 'created_at', 'status']
        read_only_fields = ['id', 'created_at']

    def get_report_data(self, obj):
        if isinstance(obj.report_data, dict):
            return {'totalTimeTaken': obj.report_data.get('totalTimeTaken', 'N/A')}
        return {}

class ContactMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for ContactMessage model.
    """
    sendCopy = serializers.BooleanField(source='send_copy', required=False)

    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'subject', 'message', 'sendCopy', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            is_active=False
        )
        return user