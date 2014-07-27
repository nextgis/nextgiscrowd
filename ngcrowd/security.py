# -*- coding: utf-8 -*-

def generate_session_id():
    import random
    import string

    return ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(10))