import { useState, useEffect, useCallback } from 'react'
import { createApi } from 'unsplash-js'

const unsplash = createApi({
    accessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY!,
})

export function useUnsplashGallery() {
    const [photos, setPhotos] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState(null)
    const [relatedPhotos, setRelatedPhotos] = useState([])
    const [favorites, setFavorites] = useState([])

    const searchPhotos = useCallback(async (searchQuery: string, pageNum: number, options = {}) => {
        setLoading(true)
        console.log(`Searching for: "${searchQuery}" with options:`, options)
        const result = await unsplash.search.getPhotos({
            query: searchQuery || 'nature',
            page: pageNum,
            perPage: 15,
            ...options
        })
        console.log('Search result:', result)
        if (result.type === 'success') {
            if (pageNum === 1) {
                setPhotos(result.response.results)
            } else {
                setPhotos(prev => [...prev, ...result.response.results])
            }
            setHasMore(result.response.results.length > 0)
        } else {
            console.error('Search failed:', result.errors)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        if (query) {
        searchPhotos(query, 1)
        }
    }, [query, searchPhotos])

    const handleSearch = (newQuery: string) => {
        console.log(`handleSearch called with query: "${newQuery}"`)
        setQuery(newQuery)
        setPage(1)
    }

    const handleAdvancedSearch = useCallback((newQuery: string, options = {}) => {
        console.log(`handleAdvancedSearch called with query: "${newQuery}" and options:`, options)
        setQuery(newQuery)
        setPage(1)
        searchPhotos(newQuery, 1, options)
    }, [searchPhotos])

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            setPage(prevPage => prevPage + 1)
            searchPhotos(query, page + 1)
        }
    }, [loading, hasMore, query, page, searchPhotos])

    const handlePhotoClick = async (photo) => {
        setSelectedPhoto(photo)
        if (photo.tags && photo.tags.length > 0) {
            const tag = photo.tags[0].title // Use the first tag
            const result = await unsplash.search.getPhotos({
                query: tag,
                page: 1,
                perPage: 5,
            })
            if (result.type === 'success') {
                setRelatedPhotos(result.response.results.filter(p => p.id !== photo.id))
            }
        } else {
            setRelatedPhotos([])
        }
    }

    const closePhotoView = () => {
        setSelectedPhoto(null)
        setRelatedPhotos([])
    }

    const toggleFavorite = (photo) => {
        setFavorites(prev =>
            prev.some(fav => fav.id === photo.id)
                ? prev.filter(fav => fav.id !== photo.id)
                : [...prev, photo]
        )
    }

    const downloadImage = async (photo) => {
        const response = await fetch(photo.links.download_location)
        const data = await response.json()
        window.open(data.url, '_blank')
    }

    return {
        photos,
        loading,
        hasMore,
        selectedPhoto,
        relatedPhotos,
        favorites,
        handleSearch,
        handleAdvancedSearch,
        loadMore,
        handlePhotoClick,
        closePhotoView,
        toggleFavorite,
        downloadImage,
    }
}
