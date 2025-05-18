// import { processExtractors } from '../extractor-utils';
// import { Extractor } from '../../custom-views/registry';

// describe('extractor-utils', () => {
//   let mockDispatch: jest.Mock;

//   beforeEach(() => {
//     mockDispatch = jest.fn();
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('processExtractors', () => {
//     it('should handle empty or undefined extractors', () => {
//       processExtractors({}, undefined, mockDispatch);
//       processExtractors({}, [], mockDispatch);
      
//       expect(mockDispatch).not.toHaveBeenCalled();
//     });

//     it('should process list type extractors correctly', () => {
//       const data = {
//         extracted: {
//           suggestions: [
//             { id: 1, name: 'Item 1' },
//             { id: 2, name: 'Item 2' },
//             { id: 3, name: 'Item 3' },
//           ]
//         }
//       };

//       const extractors: Extractor[] = [
//         {
//           brokerId: 'app-suggestion-entry',
//           path: 'data["extracted"]["suggestions"]',
//           type: 'list'
//         }
//       ];

//       processExtractors({ data }, extractors, mockDispatch);

//       expect(mockDispatch).toHaveBeenCalledTimes(3);
//       expect(mockDispatch).toHaveBeenNthCalledWith(1, {
//         payload: {
//           brokerId: 'app-suggestion-entry-1',
//           value: { id: 1, name: 'Item 1' }
//         },
//         type: 'broker/setValue'
//       });
//       expect(mockDispatch).toHaveBeenNthCalledWith(2, {
//         payload: {
//           brokerId: 'app-suggestion-entry-2',
//           value: { id: 2, name: 'Item 2' }
//         },
//         type: 'broker/setValue'
//       });
//       expect(mockDispatch).toHaveBeenNthCalledWith(3, {
//         payload: {
//           brokerId: 'app-suggestion-entry-3',
//           value: { id: 3, name: 'Item 3' }
//         },
//         type: 'broker/setValue'
//       });
//     });

//     it('should process text type extractors correctly with wildcard paths', () => {
//       const data = {
//         extracted: {
//           suggestions: [
//             { id: 1, image_description: 'Image 1 desc' },
//             { id: 2, image_description: 'Image 2 desc' },
//             { id: 3, image_description: 'Image 3 desc' },
//           ]
//         }
//       };

//       const extractors: Extractor[] = [
//         {
//           brokerId: 'image-descriptions',
//           path: 'data["extracted"]["suggestions"][?]["image_description"]',
//           type: 'text'
//         }
//       ];

//       processExtractors({ data }, extractors, mockDispatch);

//       expect(mockDispatch).toHaveBeenCalledTimes(3);
//       expect(mockDispatch).toHaveBeenNthCalledWith(1, {
//         payload: {
//           brokerId: 'image-descriptions-1',
//           value: 'Image 1 desc'
//         },
//         type: 'broker/setValue'
//       });
//       expect(mockDispatch).toHaveBeenNthCalledWith(2, {
//         payload: {
//           brokerId: 'image-descriptions-2',
//           value: 'Image 2 desc'
//         },
//         type: 'broker/setValue'
//       });
//       expect(mockDispatch).toHaveBeenNthCalledWith(3, {
//         payload: {
//           brokerId: 'image-descriptions-3',
//           value: 'Image 3 desc'
//         },
//         type: 'broker/setValue'
//       });
//     });

//     it('should process single type extractors correctly', () => {
//       const data = {
//         extracted: {
//           title: 'Main Title'
//         }
//       };

//       const extractors: Extractor[] = [
//         {
//           brokerId: 'page-title',
//           path: 'data["extracted"]["title"]',
//           type: 'single'
//         }
//       ];

//       processExtractors({ data }, extractors, mockDispatch);

//       expect(mockDispatch).toHaveBeenCalledTimes(1);
//       expect(mockDispatch).toHaveBeenCalledWith({
//         payload: {
//           brokerId: 'page-title',
//           value: 'Main Title'
//         },
//         type: 'broker/setValue'
//       });
//     });

//     it('should process map type extractors correctly', () => {
//       const data = {
//         extracted: {
//           metadata: {
//             author: 'John Doe',
//             date: '2023-01-01',
//             tags: ['tag1', 'tag2']
//           }
//         }
//       };

//       const extractors: Extractor[] = [
//         {
//           brokerId: 'metadata',
//           path: 'data["extracted"]["metadata"]',
//           type: 'map'
//         }
//       ];

//       processExtractors({ data }, extractors, mockDispatch);

//       expect(mockDispatch).toHaveBeenCalledTimes(3);
//       expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
//         payload: {
//           brokerId: 'metadata-author',
//           value: 'John Doe'
//         }
//       }));
//       expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
//         payload: {
//           brokerId: 'metadata-date',
//           value: '2023-01-01'
//         }
//       }));
//       expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
//         payload: {
//           brokerId: 'metadata-tags',
//           value: ['tag1', 'tag2']
//         }
//       }));
//     });

//     it('should handle missing data gracefully', () => {
//       const data = {
//         extracted: {
//           // Missing suggestions array
//         }
//       };

//       const extractors: Extractor[] = [
//         {
//           brokerId: 'app-suggestion-entry',
//           path: 'data["extracted"]["suggestions"]',
//           type: 'list'
//         }
//       ];

//       // This should not throw an error
//       processExtractors({ data }, extractors, mockDispatch);
//       expect(mockDispatch).not.toHaveBeenCalled();
//     });
//   });
// }); 