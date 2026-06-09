from django.db import models
from django.conf import settings


class SavedSpin(models.Model):
    SPIN_TYPES = [
        ('character', 'Character'),
        ('story', 'Story'),
        ('music', 'Music'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='spins',
    )
    project = models.ForeignKey(
        'projects.Project',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='spins',
    )
    spin_type = models.CharField(max_length=20, choices=SPIN_TYPES)
    payload = models.JSONField()
    user_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        user_label = self.user.email if self.user else 'guest'
        return f'{self.spin_type} spin by {user_label} @ {self.created_at:%Y-%m-%d}'


class StoryElement(models.Model):
    category = models.CharField(max_length=100, db_index=True)
    label = models.CharField(max_length=600)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['category', 'id']

    def __str__(self):
        return f'{self.category}: {self.label[:60]}'
