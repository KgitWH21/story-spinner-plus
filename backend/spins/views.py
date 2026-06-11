import json
import random
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.conf import settings
from .models import SavedSpin, StoryElement


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


# Categories drawn when reshuffling the wheel for each mode
MODE_WHEEL_CATEGORIES = {
    'character': [
        'character.personality_traits',
        'character.flaws',
        'character.motivations',
        'character.occupation',
        'character.special_abilities',
        'character.speech',
        'character.heritage',
        'character.trauma',
    ],
    'story': [
        'plot.archetypes',
        'plot.genres',
        'plot.perspectives',
        'plot.universal_human_questions',
    ],
    'music': [
        'music.style',
        'music.emotion',
        'music.chord_progression',
        'music.ambience_idea',
    ],
}


class WheelSetView(APIView):
    """
    GET /api/elements/wheel-set/?mode=story
    Returns 8 randomly sampled StoryElements from mode-appropriate categories,
    shaped as wheel wedges. Frontend uses this to replace the default archetype wheel.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get('mode', 'character')
        cats = MODE_WHEEL_CATEGORIES.get(mode, MODE_WHEEL_CATEGORIES['character'])

        # Sample roughly evenly from each category so no single large category dominates
        per_cat = 8 // len(cats)
        remainder = 8 % len(cats)
        picked = []
        shuffled_cats = cats[:]
        random.shuffle(shuffled_cats)
        for i, cat in enumerate(shuffled_cats):
            n = per_cat + (1 if i < remainder else 0)
            qs = list(StoryElement.objects.filter(category=cat))
            if len(qs) < n:
                picked.extend(qs)
            else:
                picked.extend(random.sample(qs, n))

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
