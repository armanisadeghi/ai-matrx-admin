import { createApi } from 'unsplash-js';
import { NextResponse } from 'next/server';

const unsplash = createApi({
    accessKey: process.env.UNSPLASH_ACCESS_KEY!,
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
        case 'searchPhotos':
            const query = searchParams.get('query');
            const page = searchParams.get('page') || '1';
            const perPage = searchParams.get('perPage') || '10';
            const result = await unsplash.search.getPhotos({
                query: query!,
                page: parseInt(page),
                perPage: parseInt(perPage),
            });
            return NextResponse.json(result);

        case 'getRandomPhoto':
            const randomResult = await unsplash.photos.getRandom({});
            return NextResponse.json(randomResult);

        case 'getCollections':
            const collectionsResult = await unsplash.collections.list({});
            return NextResponse.json(collectionsResult);

        default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
}