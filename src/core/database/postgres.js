import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg ;

const potgresPool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) ,
    database:process.env.POSTGRES_DATABASE,
    user:process.env.POSTGRES_USER,
    password:process.env.POSTGRES_PASSWORD,  

});

export default potgresPool;