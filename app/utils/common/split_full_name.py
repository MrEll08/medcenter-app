def split_full_name(full_name):
    parts = full_name.split(" ")
    surname, name, patronymic = None, None, None

    match len(parts):
        case 3:
            surname, name, patronymic = parts
        case 2:
            surname, name = parts
        case _:
            raise ValueError(f"Invalid full name. It must have 2 or 3 parts, got: {full_name}")

    return surname, name, patronymic