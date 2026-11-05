def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n-1)


print(factorial(5))


def json_to_csv(json_file, csv_file):
    import json
    import csv

    with open(json_file, 'r') as f:
        data = json.load(f)

    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        # Write header
        writer.writerow(data[0].keys())
        # Write data
        for row in data:
            writer.writerow(row.values())


json_to_csv('data.json', 'data.csv')
