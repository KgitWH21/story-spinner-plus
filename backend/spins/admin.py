from django.contrib import admin
from .models import SavedSpin


@admin.register(SavedSpin)
class SavedSpinAdmin(admin.ModelAdmin):
    list_display = ['spin_type', 'user', 'project', 'created_at']
    list_filter = ['spin_type']
    search_fields = ['user__email']
