const getJWTPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }
    const payloadBase64 = parts[1];
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");

    // Node.js: Use Buffer to decode Base64
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT payload:", error);
    return null;
  }
};

export default getJWTPayload;
