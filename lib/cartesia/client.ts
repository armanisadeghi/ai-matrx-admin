import { CartesiaClient } from "@cartesia/cartesia-js";

const cartesia = new CartesiaClient({
    apiKey: process.env.NEXT_PUBLIC_CARTESIA_API_KEY,
});


export default cartesia;
