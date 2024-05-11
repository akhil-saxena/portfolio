const folderStructure = {
  patrika_gate: "./images/patirika_gate",
};

const getImagesByOccasion = () => {
  const imagesByOccasion = {};

  for (const [occasion, folderPath] of Object.entries(folderStructure)) {
    // Read images from folderPath
    // For simplicity, let's assume images are hardcoded here
    const images = [
      "image1.jpg",
      "image2.jpg",
      // Add more images as needed
    ];

    imagesByOccasion[occasion] = images.map((image) => ({
      occasion,
      src: `${folderPath}/${image}`,
      // Other properties like size, subHtml, thumbnail can be added here
    }));
  }

  return imagesByOccasion;
};

export default getImagesByOccasion;
