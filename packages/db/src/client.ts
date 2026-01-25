import { PrismaClient } from "@prisma/client";

const prismaclient = new PrismaClient();

export { prismaclient };
export default prismaclient;
