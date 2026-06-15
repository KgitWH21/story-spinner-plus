import json
import random
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.conf import settings
from pgvector.django import CosineDistance
from openai import OpenAI
from .models import SavedSpin, StoryElement, Draft


DATA_DIR = settings.DATA_DIR

MODE_FILES = {
    'character': 'character_archetypes.json',
    'story': 'story_archetypes.json',
    'music': 'music_archetypes.json',
}

ALTERNATING_COLORS = ['#e7c365', '#c9a74d']


def load_archetypes(mode):
    path = DATA_DIR / MODE_FILES.get(mode, 'character_archetypes.json')
    with open(path) as f:
        return json.load(f)


def _pick(value):
    """Return a random item if value is a list, otherwise return value as-is."""
    return random.choice(value) if isinstance(value, list) else value


def generate_result(archetype_data):
    """
    Resolve a payload_template into a concrete result by sampling from
    any list values. Works for character, story, and music templates.
    """
    template = archetype_data.get('payload_template', {})
    result = {'archetype': archetype_data['label']}

    for key, value in template.items():
        if key == 'tarotArc' and isinstance(value, dict):
            result['tarotArc'] = {arc_key: _pick(arc_val) for arc_key, arc_val in value.items()}
        elif key == 'instrumentation' and isinstance(value, dict):
            result['instrumentation'] = {k: _pick(v) for k, v in value.items()}
        else:
            result[key] = _pick(value)

    return result


class MatrixView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get('mode', 'character')
        if mode not in MODE_FILES:
            return Response({'error': 'Invalid mode'}, status=400)
        archetypes = load_archetypes(mode)
        wedges = [
            {
                'id': i,
                'label': a['label'],
                'color': ALTERNATING_COLORS[i % 2],
            }
            for i, a in enumerate(archetypes)
        ]
        return Response({'mode': mode, 'wedges': wedges})


class GenerateView(APIView):
    """
    GET /api/generate/?mode=character&wedge_id=2
    Returns a fully-resolved spin result for the selected wedge.
    Called by the frontend after the wheel animation settles.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get('mode', 'character')
        wedge_id = request.query_params.get('wedge_id')

        if mode not in MODE_FILES:
            return Response({'error': 'Invalid mode'}, status=400)
        if wedge_id is None:
            return Response({'error': 'wedge_id required'}, status=400)

        try:
            wedge_id = int(wedge_id)
        except ValueError:
            return Response({'error': 'wedge_id must be an integer'}, status=400)

        archetypes = load_archetypes(mode)
        if wedge_id < 0 or wedge_id >= len(archetypes):
            return Response({'error': 'wedge_id out of range'}, status=400)

        result = generate_result(archetypes[wedge_id])
        return Response({'mode': mode, 'wedge_id': wedge_id, 'result': result})


class SpinDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            spin = request.user.spins.get(pk=pk)
        except SavedSpin.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        spin.delete()
        return Response(status=204)


class SpinView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)
        qs = request.user.spins.order_by('-created_at')
        spin_type = request.query_params.get('type')
        if spin_type in ('character', 'story', 'music'):
            qs = qs.filter(spin_type=spin_type)
        data = [
            {
                'id': s.id,
                'spin_type': s.spin_type,
                'payload': s.payload,
                'user_notes': s.user_notes,
                'project_id': s.project_id,
                'created_at': s.created_at,
            }
            for s in qs[:100]
        ]
        return Response(data)

    def post(self, request):
        spin_type = request.data.get('spin_type')
        payload = request.data.get('payload')
        user_notes = request.data.get('user_notes', '')
        project_id = request.data.get('project_id')

        if spin_type not in ('character', 'story', 'music'):
            return Response({'error': 'Invalid spin_type'}, status=400)
        if not payload:
            return Response({'error': 'payload required'}, status=400)

        user = request.user if request.user.is_authenticated else None
        spin = SavedSpin.objects.create(
            user=user,
            project_id=project_id,
            spin_type=spin_type,
            payload=payload,
            user_notes=user_notes,
        )
        return Response({'id': spin.id, 'created_at': spin.created_at}, status=201)


# Default categories returned by a shuffle when no ?categories param is given
DEFAULT_SHUFFLE_CATEGORIES = [
    'plot.archetypes',
    'plot.genres',
    'character.descriptors',
    'character.theories_of_control',
    'plot.social_issues',
]


class ElementCategoriesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = list(
            StoryElement.objects.values_list('category', flat=True).distinct().order_by('category')
        )
        return Response({'categories': categories})


class ElementShuffleView(APIView):
    """
    GET /api/elements/shuffle/
    GET /api/elements/shuffle/?categories=plot.archetypes,plot.genres

    Returns one random StoryElement per requested category.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        raw = request.query_params.get('categories', '')
        categories = [c.strip() for c in raw.split(',') if c.strip()] or DEFAULT_SHUFFLE_CATEGORIES

        result = {}
        for cat in categories:
            qs = StoryElement.objects.filter(category=cat)
            count = qs.count()
            if count == 0:
                continue
            item = qs[random.randint(0, count - 1)]
            result[cat] = {
                'label': item.label,
                'metadata': item.metadata,
            }

        return Response({'shuffle': result})



class WheelSetView(APIView):
    """
    GET /api/elements/wheel-set/?mode=story
    Returns 8 StoryElements drawn from 8 randomly-selected categories so every
    page load produces a different mix. One element per category is chosen at
    random after the categories themselves are randomly sampled.
    """
    permission_classes = [AllowAny]

    # Category prefix scoped to each mode so modes stay thematically coherent
    MODE_PREFIXES = {
        'character': 'character.',
        'story': 'plot.',
        'music': 'music.',
    }

    def get(self, request):
        mode = request.query_params.get('mode', 'character')
        prefix = self.MODE_PREFIXES.get(mode, 'character.')

        # Pick 8 random categories scoped to this mode's prefix
        all_cats = list(
            StoryElement.objects
            .filter(category__startswith=prefix)
            .values_list('category', flat=True)
            .distinct()
        )
        if not all_cats:
            return Response({'mode': mode, 'wedges': [], 'is_custom': True})

        chosen_cats = random.sample(all_cats, min(8, len(all_cats)))

        # Pick one random item from each chosen category
        picked = []
        for cat in chosen_cats:
            qs = list(StoryElement.objects.filter(category=cat))
            if qs:
                picked.append(random.choice(qs))

        random.shuffle(picked)
        wedges = [
            {
                'id': i,
                'label': elem.label[:22] + '…' if len(elem.label) > 22 else elem.label,
                'full_label': elem.label,
                'color': ALTERNATING_COLORS[i % 2],
                'category': elem.category,
                'metadata': elem.metadata,
            }
            for i, elem in enumerate(picked[:8])
        ]
        return Response({'mode': mode, 'wedges': wedges, 'is_custom': True})


VALID_MODES = ('character', 'story', 'music')


def _draft_to_dict(draft):
    return {
        'id': draft.id,
        'name': draft.name,
        'mode': draft.mode,
        'elements': draft.elements,
        'notes': draft.notes,
        'created_at': draft.created_at,
        'updated_at': draft.updated_at,
    }


class DraftListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        drafts = request.user.drafts.all()[:50]
        return Response([_draft_to_dict(d) for d in drafts])

    def post(self, request):
        name = request.data.get('name', 'Untitled')
        mode = request.data.get('mode', 'character')
        elements = request.data.get('elements', {})
        notes = request.data.get('notes', {})
        if mode not in VALID_MODES:
            return Response({'error': 'Invalid mode'}, status=400)
        draft = Draft.objects.create(
            user=request.user,
            name=name,
            mode=mode,
            elements=elements,
            notes=notes,
        )
        return Response(_draft_to_dict(draft), status=201)


class DraftDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_draft(self, request, pk):
        try:
            return request.user.drafts.get(pk=pk)
        except Draft.DoesNotExist:
            return None

    def get(self, request, pk):
        draft = self._get_draft(request, pk)
        if not draft:
            return Response({'error': 'Not found'}, status=404)
        return Response(_draft_to_dict(draft))

    def patch(self, request, pk):
        draft = self._get_draft(request, pk)
        if not draft:
            return Response({'error': 'Not found'}, status=404)
        update_fields = ['updated_at']
        if 'name' in request.data:
            draft.name = request.data['name']
            update_fields.append('name')
        if 'mode' in request.data:
            if request.data['mode'] not in VALID_MODES:
                return Response({'error': 'Invalid mode'}, status=400)
            draft.mode = request.data['mode']
            update_fields.append('mode')
        if 'elements' in request.data:
            draft.elements = request.data['elements']
            update_fields.append('elements')
        if 'notes' in request.data:
            draft.notes = request.data['notes']
            update_fields.append('notes')
        draft.save(update_fields=update_fields)
        return Response(_draft_to_dict(draft))

    def delete(self, request, pk):
        draft = self._get_draft(request, pk)
        if not draft:
            return Response({'error': 'Not found'}, status=404)
        draft.delete()
        return Response(status=204)


class ElementSearchView(APIView):
    """
    GET /api/elements/search/?q=isolation+and+betrayal&mode=story&limit=8

    Embeds the query with OpenAI, then uses pgvector cosine similarity to find
    the nearest StoryElements. Returns results in the same shape as wheel-set
    wedges so the frontend can swap them in directly.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        mode  = request.query_params.get('mode', 'character')
        limit = min(int(request.query_params.get('limit', 8)), 20)

        if not query:
            return Response({'error': 'q parameter required'}, status=400)

        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return Response({'error': 'Search not configured'}, status=503)

        # Embed the search query using the same model as the batch job
        client = OpenAI(api_key=api_key)
        response = client.embeddings.create(
            model='text-embedding-3-small',
            input=query,
        )
        query_vector = response.data[0].embedding

        # Mode prefix scopes results so a story search doesn't return music elements
        mode_prefixes = {
            'character': 'character.',
            'story':     'plot.',
            'music':     'music.',
        }
        prefix = mode_prefixes.get(mode, 'character.')

        # Order by cosine distance (lower = more similar), skip unembedded rows
        results = (
            StoryElement.objects
            .filter(category__startswith=prefix, embedding__isnull=False)
            .order_by(CosineDistance('embedding', query_vector))[:limit]
        )

        ALTERNATING_COLORS = ['#e7c365', '#c9a74d']
        wedges = [
            {
                'id': i,
                'label': el.label[:22] + '…' if len(el.label) > 22 else el.label,
                'full_label': el.label,
                'color': ALTERNATING_COLORS[i % 2],
                'category': el.category,
                'metadata': el.metadata,
            }
            for i, el in enumerate(results)
        ]

        return Response({'mode': mode, 'query': query, 'wedges': wedges})
