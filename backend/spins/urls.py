from django.urls import path
from . import views

urlpatterns = [
    path('matrix/', views.MatrixView.as_view(), name='matrix'),
    path('generate/', views.GenerateView.as_view(), name='generate'),
    path('spins/', views.SpinView.as_view(), name='spins'),
    path('elements/categories/', views.ElementCategoriesView.as_view(), name='element-categories'),
    path('elements/shuffle/', views.ElementShuffleView.as_view(), name='element-shuffle'),
    path('elements/wheel-set/', views.WheelSetView.as_view(), name='element-wheel-set'),
]
