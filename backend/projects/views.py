from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Project


class ProjectListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = request.user.projects.order_by('created_at')
        data = [{'id': p.id, 'name': p.name, 'description': p.description, 'created_at': p.created_at} for p in projects]
        return Response(data)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_project(self, request, pk):
        try:
            return request.user.projects.get(pk=pk)
        except Project.DoesNotExist:
            return None

    def patch(self, request, pk):
        project = self._get_project(request, pk)
        if project is None:
            return Response({'error': 'Not found'}, status=404)
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Name required'}, status=400)
        project.name = name
        project.save(update_fields=['name'])
        return Response({'id': project.id, 'name': project.name})
