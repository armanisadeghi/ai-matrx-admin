import Star from "./star";

export default function Colors() {
    return (
        <>
            <div className="flex">
                <Star filled rating={1} />
                <Star filled rating={2} />
                <Star filled rating={3} />
                <Star rating={4} />
                <Star rating={5} />
            </div>
            <div className="flex">
                <Star color="slate" filled rating={1} />
                <Star color="slate" filled rating={2} />
                <Star color="slate" filled rating={3} />
                <Star color="slate" rating={4} />
                <Star color="slate" rating={5} />
            </div>
            <div className="flex">
                <Star color="red" filled rating={1} />
                <Star color="red" filled rating={2} />
                <Star color="red" filled rating={3} />
                <Star color="red" rating={4} />
                <Star color="red" rating={5} />
            </div>
            <div className="flex">
                <Star color="green" filled rating={1} />
                <Star color="green" filled rating={2} />
                <Star color="green" filled rating={3} />
                <Star color="green" rating={4} />
                <Star color="green" rating={5} />
            </div>
        </>
    );
}
