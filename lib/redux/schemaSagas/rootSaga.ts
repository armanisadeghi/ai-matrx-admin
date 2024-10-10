// // File Location: lib/redux/sagas/rootSaga.ts
//
// import { all, fork } from 'redux-saga/effects';
// import { watchFetchTableData } from './watchers/tableDataWatcher'; // Example dynamic table data watcher
// import { watchCreateEntity } from './watchers/entityWatcher'; // Example dynamic entity creation watcher
//
// export default function* rootSaga() {
//     yield all([
//         fork(watchFetchTableData),
//         fork(watchCreateEntity),
//         // Add more forks for each dynamic watcher
//     ]);
// }
