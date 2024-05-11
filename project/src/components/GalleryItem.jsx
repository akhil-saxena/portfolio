import React from "react";

const GalleryItem = ({ data }) => {
  return (
    <a
      className="gallery-item"
      data-src={data.src}
      data-sub-html={data.subHtml}
    >
      <img
        className="gallery-image"
        src={data.src}
        alt={data.alt}
        title={data.title}
      />
    </a>
  );
};

export default GalleryItem;
