interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <label htmlFor="photo-search" className="sr-only">
        Search photos
      </label>
      <input
        id="photo-search"
        type="search"
        placeholder="Search by title or tag..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
        aria-label="Search photos by title or tag"
      />
    </div>
  );
}
