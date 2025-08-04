// src/utils/imageUtils.js
const BASE_URL = 'http://192.168.0.177:8011';

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  console.log('[IMAGE_UTILS] Processing image path:', imagePath);
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it's a relative path starting with /uploads/, construct full URL
  if (imagePath.startsWith('/uploads/')) {
    const fullUrl = `${BASE_URL}${imagePath}`;
    console.log('[IMAGE_UTILS] Constructed URL:', fullUrl);
    return fullUrl;
  }
  
  // If it's just a filename, construct the full path
  const fullUrl = `${BASE_URL}/uploads/${imagePath}`;
  console.log('[IMAGE_UTILS] Constructed URL from filename:', fullUrl);
  return fullUrl;
};

export const getProfileImageUrl = (user) => {
  if (!user?.profileImage) {
    console.log('[IMAGE_UTILS] No profile image found for user');
    return null;
  }
  
  const imageUrl = getImageUrl(user.profileImage);
  console.log('[IMAGE_UTILS] Profile image URL:', imageUrl);
  return imageUrl;
};