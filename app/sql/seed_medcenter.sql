WITH inserted_doctors AS (
    INSERT INTO doctor (name, surname, patronymic, full_name, speciality)
    VALUES
        ('Иван',   'Иванов',   'Иванович',  'Иванов Иван Иванович',  'Терапевт'),
        ('Пётр',   'Петров',   NULL,        'Петров Пётр',           'Хирург'),
        ('Анна',   'Сидорова', 'Сергеевна', 'Сидорова Анна Сергеевна','Стоматолог')
    RETURNING id
),
inserted_clients AS (
    INSERT INTO client (name, surname, patronymic, full_name, phone_number, date_of_birth)
    VALUES
        ('Мария',   'Павлова',  NULL,        'Павлова Мария',        '+358401111111', DATE '1995-04-12'),
        ('Сергей',  'Егоров',   'Игоревич',  'Егоров Сергей Игоревич','+358402222222', DATE '1990-11-30'),
        ('Ольга',   'Кузнецова',NULL,        'Кузнецова Ольга',      '+358403333333', DATE '1988-02-05'),
        ('Илья',    'Смирнов',  'Петрович',  'Смирнов Илья Петрович','+358404444444', DATE '2001-07-19'),
        ('Дмитрий', 'Соколов',  NULL,        'Соколов Дмитрий',      '+358405555555', DATE '1998-09-01')
    RETURNING id
),
v AS (
    INSERT INTO visit (client_id, doctor_id, start_date, end_date, procedure, cost, status)
    VALUES
        -- сегодня + 1 час
        ((SELECT id FROM inserted_clients LIMIT 1 OFFSET 0),
         (SELECT id FROM inserted_doctors LIMIT 1 OFFSET 0),
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '1 hour',
         'Первичный приём', 50.00, 'CONFIRMED'::visit_status),

        -- завтра у хирурга
        ((SELECT id FROM inserted_clients LIMIT 1 OFFSET 1),
         (SELECT id FROM inserted_doctors LIMIT 1 OFFSET 1),
         CURRENT_TIMESTAMP + interval '1 day',
         CURRENT_TIMESTAMP + interval '1 day' + interval '1 hour',
         'Консультация', 75.00, 'UNCONFIRMED'::visit_status),

        -- послезавтра у стоматолога
        ((SELECT id FROM inserted_clients LIMIT 1 OFFSET 2),
         (SELECT id FROM inserted_doctors LIMIT 1 OFFSET 2),
         CURRENT_TIMESTAMP + interval '2 day',
         CURRENT_TIMESTAMP + interval '2 day' + interval '1 hour',
         'Чистка зубов', 120.00, 'CONFIRMED'::visit_status),

        -- прошлый визит
        ((SELECT id FROM inserted_clients LIMIT 1 OFFSET 3),
         (SELECT id FROM inserted_doctors LIMIT 1 OFFSET 0),
         CURRENT_TIMESTAMP - interval '3 day',
         CURRENT_TIMESTAMP - interval '3 day' + interval '1 hour',
         'Повторный приём', 60.00, 'CONFIRMED'::visit_status),

        -- отменённый
        ((SELECT id FROM inserted_clients LIMIT 1 OFFSET 4),
         (SELECT id FROM inserted_doctors LIMIT 1 OFFSET 1),
         CURRENT_TIMESTAMP + interval '3 day',
         CURRENT_TIMESTAMP + interval '3 day' + interval '1 hour',
         'Консультация', 0.00, 'CONFIRMED'::visit_status)
    RETURNING id
)
SELECT 'seeded visits: ' || count(*) AS info FROM v;
