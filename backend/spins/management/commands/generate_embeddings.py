from django.core.management.base import BaseCommand
from django.conf import settings
from openai import OpenAI
from spins.models import StoryElement


BATCH_SIZE = 100  # OpenAI allows up to 2048 inputs per request


class Command(BaseCommand):
    help = 'Generate and store OpenAI embeddings for all StoryElements'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Re-generate embeddings even for elements that already have one',
        )

    def handle(self, *args, **options):
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        qs = StoryElement.objects.all()
        if not options['overwrite']:
            qs = qs.filter(embedding=None)

        total = qs.count()
        if total == 0:
            self.stdout.write('All elements already have embeddings. Use --overwrite to regenerate.')
            return

        self.stdout.write(f'Generating embeddings for {total} elements...')
        processed = 0

        # Process in batches to stay within API limits and show progress
        elements = list(qs)
        for i in range(0, len(elements), BATCH_SIZE):
            batch = elements[i:i + BATCH_SIZE]

            # Build text to embed: "category: label" gives the model useful context
            texts = [f'{el.category}: {el.label}' for el in batch]

            response = client.embeddings.create(
                model='text-embedding-3-small',
                input=texts,
            )

            # Pair each embedding back to its element and bulk-update
            for el, embedding_data in zip(batch, response.data):
                el.embedding = embedding_data.embedding

            StoryElement.objects.bulk_update(batch, ['embedding'])
            processed += len(batch)
            self.stdout.write(f'  {processed}/{total}')

        self.stdout.write(self.style.SUCCESS(f'Done. {processed} embeddings stored.'))
