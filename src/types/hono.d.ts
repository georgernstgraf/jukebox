import { Hono } from "hono";
import { Session } from "./session"; // Adjust path as needed

declare module "hono" {
    interface Context {
        session: Session;
    }
}
