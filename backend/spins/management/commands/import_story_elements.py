import json
from django.core.management.base import BaseCommand
from django.conf import settings
from spins.models import StoryElement

# Maps music archetype payload_template keys to StoryElement category names
MUSIC_FIELD_CATEGORIES = [
    ('style', 'music.style'),
    ('emotion', 'music.emotion'),
    ('chordProgression', 'music.chord_progression'),
    ('ambienceIdea', 'music.ambience_idea'),
    ('earCandy', 'music.ear_candy'),
    ('vocalEffects', 'music.vocal_effects'),
    ('melodyIdea', 'music.melody_idea'),
]

# Nested sections in character_elements.json to import as character.* categories
CHARACTER_NESTED = [
    ('personality', 'traits',          'character.personality_traits'),
    ('personality', 'flaws',           'character.flaws'),
    ('personality', 'motivations',     'character.motivations'),
    ('background',  'occupation',      'character.occupation'),
    ('background',  'homeland',        'character.homeland'),
    ('abilities',   'skills',          'character.skills'),
    ('abilities',   'special_abilities', 'character.special_abilities'),
]

# Top-level list keys in character_elements.json to import as character.* categories
CHARACTER_TOP_LEVEL = [
    ('CHARACTER_SPEECH',           'character.speech'),
    ('CHARACTER_NATIONAL_HERITAGE','character.heritage'),
    ('PRIMARY_TRAUMATIC_EVENT',    'character.trauma'),
]


class Command(BaseCommand):
    help = 'Import story_elements.json, music_archetypes.json, and character_elements.json into the StoryElement table'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing records first')

    def handle(self, *args, **options):
        if options['clear']:
            count, _ = StoryElement.objects.all().delete()
            self.stdout.write(f'Cleared {count} existing records')

        bulk = []

        # --- Story elements ---
        path = settings.DATA_DIR / 'story_elements.json'
        with open(path) as f:
            data = json.load(f)

        for top_key, sub_dict in data.items():
            for sub_key, items in sub_dict.items():
                category = f'{top_key}.{sub_key}'
                for item in items:
                    if isinstance(item, dict):
                        label = item.get('title') or item.get('statement') or str(item)
                        meta = item
                    else:
                        label = str(item)
                        meta = None
                    bulk.append(StoryElement(category=category, label=label, metadata=meta))

        # --- Music elements extracted from music_archetypes.json ---
        music_path = settings.DATA_DIR / 'music_archetypes.json'
        with open(music_path) as f:
            music_archetypes = json.load(f)

        seen = {field_cat: set() for _, field_cat in MUSIC_FIELD_CATEGORIES}
        for archetype in music_archetypes:
            tmpl = archetype.get('payload_template', {})
            for tmpl_key, category in MUSIC_FIELD_CATEGORIES:
                value = tmpl.get(tmpl_key)
                if value and value not in seen[category]:
                    seen[category].add(value)
                    bulk.append(StoryElement(
                        category=category,
                        label=value,
                        metadata={'archetype': archetype['label']},
                    ))

        # --- Character elements from character_elements.json ---
        char_path = settings.DATA_DIR / 'character_elements.json'
        with open(char_path) as f:
            char_data = json.load(f)

        for top_key, sub_key, category in CHARACTER_NESTED:
            for item in char_data.get(top_key, {}).get(sub_key, []):
                label = item if isinstance(item, str) else str(item)
                bulk.append(StoryElement(category=category, label=label))

        for json_key, category in CHARACTER_TOP_LEVEL:
            for item in char_data.get(json_key, []):
                label = item if isinstance(item, str) else str(item)
                if label and label.lower() != 'none':
                    bulk.append(StoryElement(category=category, label=label))

        StoryElement.objects.bulk_create(bulk)
        self.stdout.write(self.style.SUCCESS(
            f'Imported {len(bulk)} elements across '
            f'{len(set(e.category for e in bulk))} categories'
        ))
