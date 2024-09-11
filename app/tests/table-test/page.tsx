import ModernTable from "@/app/tests/table-test/ModernTable";

const columns = [
    {Header: 'Name', accessor: 'name'},
    {Header: 'Age', accessor: 'age'},
    {Header: 'Email', accessor: 'email'},
    {Header: 'Country', accessor: 'country'},
    {Header: 'Occupation', accessor: 'occupation'},
    {Header: 'Salary', accessor: 'salary'},
    {Header: 'Start Date', accessor: 'start_date'},
];

const data = [
    {
        name: 'John Doe',
        age: 30,
        email: 'johndoe@example.com',
        country: 'USA',
        occupation: 'Engineer',
        salary: 70000,
        start_date: '2010-05-21'
    },
    {
        name: 'Jane Smith',
        age: 25,
        email: 'janesmith@example.com',
        country: 'Canada',
        occupation: 'Designer',
        salary: 65000,
        start_date: '2012-07-13'
    },
    {
        name: 'Michael Johnson',
        age: 40,
        email: 'michaelj@example.com',
        country: 'UK',
        occupation: 'Doctor',
        salary: 120000,
        start_date: '2008-03-29'
    },
    {
        name: 'Emily Davis',
        age: 35,
        email: 'emilyd@example.com',
        country: 'Australia',
        occupation: 'Lawyer',
        salary: 90000,
        start_date: '2011-09-04'
    },
    {
        name: 'Chris Lee',
        age: 28,
        email: 'chrisl@example.com',
        country: 'USA',
        occupation: 'Architect',
        salary: 80000,
        start_date: '2014-06-23'
    },
    {
        name: 'Sophia Brown',
        age: 22,
        email: 'sophiab@example.com',
        country: 'Canada',
        occupation: 'Scientist',
        salary: 55000,
        start_date: '2015-01-17'
    },
    {
        name: 'Liam Wilson',
        age: 32,
        email: 'liamw@example.com',
        country: 'UK',
        occupation: 'Chef',
        salary: 60000,
        start_date: '2009-11-25'
    },
    {
        name: 'Isabella Taylor',
        age: 29,
        email: 'isabellat@example.com',
        country: 'Australia',
        occupation: 'Teacher',
        salary: 58000,
        start_date: '2013-04-14'
    },
    {
        name: 'David Martinez',
        age: 45,
        email: 'davidm@example.com',
        country: 'USA',
        occupation: 'Engineer',
        salary: 75000,
        start_date: '2007-10-09'
    },
    {
        name: 'Olivia Garcia',
        age: 26,
        email: 'oliviag@example.com',
        country: 'Canada',
        occupation: 'Designer',
        salary: 67000,
        start_date: '2016-03-08'
    },
    {
        name: 'Daniel Anderson',
        age: 38,
        email: 'daniela@example.com',
        country: 'UK',
        occupation: 'Doctor',
        salary: 115000,
        start_date: '2006-08-15'
    },
    {
        name: 'Ava White',
        age: 24,
        email: 'avaw@example.com',
        country: 'Australia',
        occupation: 'Lawyer',
        salary: 95000,
        start_date: '2017-02-21'
    },
    {
        name: 'James Thomas',
        age: 31,
        email: 'jamest@example.com',
        country: 'USA',
        occupation: 'Architect',
        salary: 82000,
        start_date: '2010-12-12'
    },
    {
        name: 'Mia Moore',
        age: 27,
        email: 'miam@example.com',
        country: 'Canada',
        occupation: 'Scientist',
        salary: 57000,
        start_date: '2018-05-19'
    },
    {
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
    const handleAdd = (newItem) => {
        // Logic to add new item
    };

    const handleEdit = (id, updatedItem) => {
        // Logic to edit item
    };

    const handleDelete = (item) => {
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

