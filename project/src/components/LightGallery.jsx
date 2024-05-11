import React from "react";
import { Row, Col } from "react-bootstrap"; // Import Row and Col components from react-bootstrap
import LightGallery from "lightgallery/react";
import lgZoom from "lightgallery/plugins/zoom";
import lgVideo from "lightgallery/plugins/video";
import GalleryItem from "./GalleryItem";
import galleryItems from "../data/galleryItems"; // Import galleryItems

const LightGalleryComponent = () => {
  return (
    <LightGallery
      plugins={[lgZoom, lgVideo]}
      mode="lg-fade"
      className="light-gallery"
    >
      <Row className="row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 mb-n30">
        {Object.values(galleryItems[0]).flatMap((occasionImages, index) =>
          occasionImages.map((item, itemIndex) => (
            <Col
              key={index * 100 + itemIndex}
              xs={12}
              sm={6}
              lg={4}
              xl={3}
              className="mb-30"
            >
              <GalleryItem data={item} />
            </Col>
          )),
        )}
      </Row>
    </LightGallery>
  );
};

export default LightGalleryComponent;
