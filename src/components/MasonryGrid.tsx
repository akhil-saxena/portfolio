interface Photo {
  id: string;
  title: string;
  category: string;
  urls: {
    original: string;
    medium: string;
    thumb: string;
  };
}

interface MasonryGridProps {
  photos: Photo[];
  onPhotoClick: (index: number) => void;
}

export default function MasonryGrid({ photos, onPhotoClick }: MasonryGridProps) {
  if (photos.length === 0) {
    return <p className="masonry-empty">No photos found.</p>;
  }

  return (
    <div className="masonry-grid">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          className="masonry-item"
          onClick={() => onPhotoClick(index)}
          aria-label={`View ${photo.title}`}
        >
          <img
            src={photo.urls.medium}
            alt={photo.title}
            loading="lazy"
            className="masonry-img"
            style={{ backgroundImage: `url(${photo.urls.thumb})` }}
          />
          <div className="masonry-overlay">
            <span className="masonry-title">{photo.title}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
