'use client';

import {Column} from 'react-table';
import {v4 as uuidv4} from 'uuid';
import ModernTable from "@/app/(authenticated)/tests/table-test/ModernTable";

interface TableData {
    id: string;
    name: string;
    age: number;
    email: string;
    country: string;
    occupation: string;
    salary: number;
    start_date: string;
    actions?: string;
}

interface Action {
    name: string;
    position?: 'above' | 'before' | 'below' | 'after' | 'behind' | 'over';
}

type MatrixColumn<T extends object> = Column<T> & {
    actions?: Action[];
};

const defaultVisibleColumns = [
    'name',
    'age',
    'email',
    'country',
    'occupation',
    'salary',
    'start_date',
    'actions',
];


const columns: MatrixColumn<TableData>[] = [
    {Header: 'ID', accessor: 'id'},
    {Header: 'Name', accessor: 'name'},
    {Header: 'Age', accessor: 'age'},
    {Header: 'Email', accessor: 'email'},
    {Header: 'Country', accessor: 'country'},
    {
        Header: 'Occupation',
        accessor: 'occupation',
        actions: [{name: 'expand', position: 'before'}]
    },
    {Header: 'Salary', accessor: 'salary'},
    {Header: 'Start Date', accessor: 'start_date'},
    {
        Header: 'Actions',
        accessor: 'actions',
        Cell: () => null,
        actions: [
            {name: 'view', position: 'after'},
            {name: 'edit', position: 'after'},
            {name: 'delete', position: 'after'},
        ],
    },
];

// Add UUIDs to each data item
const data: TableData[] = [
    {
        id: uuidv4(),
        name: 'John Doe',
        age: 30,
        email: 'johndoe@example.com',
        country: 'USA',
        occupation: 'Engineer',
        salary: 70000,
        start_date: '2010-05-21'
    },
    {
        id: uuidv4(),
        name: 'Jane Smith',
        age: 25,
        email: 'janesmith@example.com',
        country: 'Canada',
        occupation: 'Designer',
        salary: 65000,
        start_date: '2012-07-13'
    },
    {
        id: uuidv4(),
        name: 'Michael Johnson',
        age: 40,
        email: 'michaelj@example.com',
        country: 'UK',
        occupation: 'Doctor',
        salary: 120000,
        start_date: '2008-03-29'
    },
    {
        id: uuidv4(),
        name: 'Emily Davis',
        age: 35,
        email: 'emilyd@example.com',
        country: 'Australia',
        occupation: 'Lawyer',
        salary: 90000,
        start_date: '2011-09-04'
    },
    {
        id: uuidv4(),
        name: 'Chris Lee',
        age: 28,
        email: 'chrisl@example.com',
        country: 'USA',
        occupation: 'Architect',
        salary: 80000,
        start_date: '2014-06-23'
    },
    {
        id: uuidv4(),
        name: 'Sophia Brown',
        age: 22,
        email: 'sophiab@example.com',
        country: 'Canada',
        occupation: 'Scientist',
        salary: 55000,
        start_date: '2015-01-17'
    },
    {
        id: uuidv4(),
        name: 'Liam Wilson',
        age: 32,
        email: 'liamw@example.com',
        country: 'UK',
        occupation: 'Chef',
        salary: 60000,
        start_date: '2009-11-25'
    },
    {
        id: uuidv4(),
        name: 'Isabella Taylor Arman Sadeghi and other stuff too',
        age: 29,
        email: 'isabellat@example.com and a really long email',
        country: 'Australia',
        occupation: 'Teacher',
        salary: 58000,
        start_date: '2013-04-14'
    },
    {
        id: uuidv4(),
        name: 'David Martinez',
        age: 45,
        email: 'davidm@example.com',
        country: 'USA',
        occupation: 'Engineer',
        salary: 75000,
        start_date: '2007-10-09'
    },
    {
        id: uuidv4(),
        name: 'Olivia Garcia',
        age: 26,
        email: 'oliviag@example.com',
        country: 'Canada',
        occupation: 'Designer',
        salary: 67000,
        start_date: '2016-03-08'
    },
    {
        id: uuidv4(),
        name: 'Daniel Anderson',
        age: 38,
        email: 'daniela@example.com',
        country: 'UK',
        occupation: 'Doctor',
        salary: 115000,
        start_date: '2006-08-15'
    },
    {
        id: uuidv4(),
        name: 'Ava White',
        age: 24,
        email: 'avaw@example.com',
        country: 'Australia',
        occupation: 'Lawyer',
        salary: 95000,
        start_date: '2017-02-21'
    },
    {
        id: uuidv4(),
        name: 'James Thomas',
        age: 31,
        email: 'jamest@example.com',
        country: 'USA',
        occupation: 'Architect',
        salary: 82000,
        start_date: '2010-12-12'
    },
    {
        id: uuidv4(),
        name: 'Mia Moore',
        age: 27,
        email: 'miam@example.com',
        country: 'Canada',
        occupation: 'Scientist',
        salary: 57000,
        start_date: '2018-05-19'
    },
    {
        id: uuidv4(),
        name: 'Lucas Harris',
        age: 37,
        email: 'lucash@example.com',
        country: 'UK',
        occupation: 'Chef',
        salary: 61000,
        start_date: '2011-11-05'
    }
];

export default function TablePage() {
    // Define handlers using the handleActionName convention
    (window as any).handleAdd = (newItem: Omit<TableData, 'id'>) => {
        const newItemWithId: TableData = {id: uuidv4(), ...newItem};
        console.log('Adding new item:', newItemWithId);
        // Implement the actual add logic here
    };

    (window as any).handleEdit = (item: TableData) => {
        console.log('Editing item:', item);
        // Implement the actual edit logic here
    };

    (window as any).handleDelete = (item: TableData) => {
        console.log('Deleting item:', item);
        // Implement the actual delete logic here
    };

    (window as any).handleExpand = (item: TableData) => {
        console.log('Expanding item:', item);
        // Implement the expand logic here
    };

    return (
        <div className="p-2">
            <ModernTable
                columns={columns}
                data={data}
                defaultVisibleColumns={defaultVisibleColumns}
                className="pb-4 rounded-3xl bg-neutral-100 dark:bg-neutral-800"
            />
        </div>
    );
}


// https://claude.ai/chat/a18ee206-4dfb-454c-a46a-8b182fba00f8
