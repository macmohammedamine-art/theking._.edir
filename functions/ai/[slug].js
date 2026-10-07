import { serveSeo } from "../_shared/seo.js";
export function onRequest(context){ return serveSeo(context,"content","ai"); }
