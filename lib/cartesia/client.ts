import Cartesia from "@cartesia/cartesia-js";


const cartesia = new Cartesia({
    apiKey: process.env.NEXT_PUBLIC_CARTESIA_API_KEY,
});

export default cartesia;
