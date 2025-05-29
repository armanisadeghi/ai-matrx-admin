function createDynamicProcessor(functionCode, dataObject) {
    try {
      // Create a new function from the stored code
      const dynamicFunction = new Function('data', functionCode);
      
      // Execute it with the data object
      return dynamicFunction(dataObject);
    } catch (error) {
      console.error('Error executing dynamic function:', error);
      throw error;
    }
  }
  
  // Example usage:
  const storedCode = `
    return {
      ...data,
      processedAt: new Date().toISOString(),
      itemCount: data.items ? data.items.length : 0,
      summary: data.items ? data.items.map(item => item.name).join(', ') : 'No items'
    };
  `;
  
  const inputData = {
    id: 1,
    title: "Sample Data",
    items: [
      { name: "Item 1", value: 10 },
      { name: "Item 2", value: 20 }
    ]
  };
  
  const result = createDynamicProcessor(storedCode, inputData);
  console.log(result);