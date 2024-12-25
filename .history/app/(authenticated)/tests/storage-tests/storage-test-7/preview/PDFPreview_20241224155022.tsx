// components/previews/PDFPreview.tsx

interface PDFPreviewProps {
    data: Blob;
  }
  
  export default function PDFPreview({ data }: PDFPreviewProps) {
    const [url, setUrl] = useState<string>();
  
    useEffect(() => {
      const objectUrl = URL.createObjectURL(data);
      setUrl(objectUrl);
      
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [data]);
  
    if (!url) {
      return null;
    }
  
    return (
      <PDFViewer 
        url={url}
        onError={(error) => {
          console.error('PDF loading error:', error);
        }}
      />
    );
  }
  