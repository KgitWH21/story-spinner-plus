from django.urls import path
from . import views

urlpatterns = [
    path('matrix/', views.MatrixView.as_view(), name='matrix'),
    path('generate/', views.GenerateView.as_view(), name='generate'),
    path('spins/', views.SpinView.as_view(), name='spins'),
    path('spins/<int:pk>/', views.SpinDetailView.as_view(), name='spin-detail'),
    path('drafts/', views.DraftListView.as_view(), name='draft-list'),
    path('drafts/<int:pk>/', views.DraftDetailView.as_view(), name='draft-detail'),
    path('elements/categories/', views.ElementCategoriesView.as_view(), name='element-categories'),
    path('elements/shuffle/', views.ElementShuffleView.as_view(), name='element-shuffle'),
    path('elements/wheel-set/', views.WheelSetView.as_view(), name='element-wheel-set'),
    path('elements/search/', views.ElementSearchView.as_view(), name='element-search'),
]
