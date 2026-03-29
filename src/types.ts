export interface Photo {
  id: string;
  title: string;
  category: string;
  tags: string[];
  urls: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumb: string;
  };
  exif?: {
    camera: string | null;
    lens: string | null;
    aperture: string | null;
    shutter: string | null;
    iso: number | null;
    focalLength: string | null;
  };
  order: number;
  dimensions?: {
    width: number;
    height: number;
  };
}
