import { Column } from 'react-table';

interface Action {
    name: string;
    position?: 'above' | 'before' | 'below' | 'after' | 'behind' | 'over';
}

interface TableData {
    id: string;
    name: string;
    age: number;
    email: string;
    country: string;
    occupation: string;
    salary: number;
    start_date: string;
}

type MatrixColumn<T extends object> = Column<T> & {
    actions?: Action[];
};

const columns: MatrixColumn<TableData>[] = [
    { Header: 'ID', accessor: 'id' },
    { Header: 'Name', accessor: 'name' },
    { Header: 'Age', accessor: 'age' },
    { Header: 'Email', accessor: 'email' },
    { Header: 'Country', accessor: 'country' },
    { Header: 'Occupation', accessor: 'occupation', actions: [{ name: 'expand', position: 'behind' }] },
    { Header: 'Salary', accessor: 'salary' },
    { Header: 'Start Date', accessor: 'start_date' },
    {
        Header: 'Actions',
        accessor: 'start_date',
        actions: [
            { name: 'add' },
            { name: 'edit' },
            { name: 'delete' },
        ],
    },
];
