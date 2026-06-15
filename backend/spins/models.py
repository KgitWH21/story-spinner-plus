from django.db import models
from django.conf import settings
from pgvector.django import VectorField


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


class Draft(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='drafts',
    )
    name = models.CharField(max_length=200, default='Untitled')
    mode = models.CharField(max_length=20, choices=SavedSpin.SPIN_TYPES, default='character')
    elements = models.JSONField(default=dict)
    notes = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.name} ({self.user.email})'


class StoryElement(models.Model):
    category = models.CharField(max_length=100, db_index=True)
    label = models.CharField(max_length=600)
    metadata = models.JSONField(null=True, blank=True)
    embedding = VectorField(dimensions=1536, null=True, blank=True)

    class Meta:
        ordering = ['category', 'id']

    def __str__(self):
        return f'{self.category}: {self.label[:60]}'
