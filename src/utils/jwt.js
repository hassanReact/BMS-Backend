import jwt from 'jsonwebtoken';

export const generateAccessAndRefreshTokens = async (userId) => {
    const accessToken = jwt.sign({id: userId}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15m'});
    const refreshToken = jwt.sign({id: userId}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '7d'});
    return {accessToken, refreshToken};
}