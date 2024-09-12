'use client';

import ModernTable from "@/app/tests/table-test/ModernTable";
import { Column } from 'react-table';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique ids

interface TableData {
    id: string; // UUID as a string
    name: string;
    age: number;
    email: string;
    country: string;
    occupation: string;
    salary: number;
    start_date: string;
}

const columns: Column<TableData>[] = [
    { Header: 'Name', accessor: 'name' },
    { Header: 'Age', accessor: 'age' },
    { Header: 'Email', accessor: 'email' },
    { Header: 'Country', accessor: 'country' },
    { Header: 'Occupation', accessor: 'occupation' },
    { Header: 'Salary', accessor: 'salary' },
    { Header: 'Start Date', accessor: 'start_date' },
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
    const handleAdd = (newItem: Omit<TableData, 'id'>) => {
        const newItemWithId: TableData = { id: uuidv4(), ...newItem }; // Add UUID to new item
        // Logic to add new item
    };

    const handleEdit = (id: string, updatedItem: Omit<TableData, 'id'>) => {
        // Logic to edit item by id
    };

    const handleDelete = (item: TableData) => {
        // Logic to delete item
    };

    return (
        <ModernTable
            columns={columns}
            data={data}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
        />
    );
}
