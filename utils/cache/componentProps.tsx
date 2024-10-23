interface ComponentCache {
    props: any;
    expiry: number;
}

function expensiveComputation(props: any) {
    // Placeholder for expensive computation
    return props;

}

const withPropsCache = (WrappedComponent: React.ComponentType<any>, ttl = 60000) => {
    return function WithPropsCacheComponent(props: any) {
        const cacheKey = JSON.stringify(props);
        const cachedValue = sessionStorage.getItem(cacheKey);

        if (cachedValue) {
            const cached: ComponentCache = JSON.parse(cachedValue);
            if (cached.expiry > Date.now()) {
                return <WrappedComponent {...cached.props} />;
            }
            sessionStorage.removeItem(cacheKey);
        }

        const computedProps = expensiveComputation(props);
        const cacheEntry: ComponentCache = {
            props: computedProps,
            expiry: Date.now() + ttl
        };

        sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        return <WrappedComponent {...computedProps} />;
    };
};
