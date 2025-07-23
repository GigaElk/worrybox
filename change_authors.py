# change_authors.py
def commit_callback(commit):
    # Check both author email and name
    if commit.author_email == b"andrew@caramel-code.com" and \
       commit.author_name == b"Andrew Hewitt":
        commit.author_email = b"gigaelk@gmail.com"
        commit.author_name = b"GigaElk"

    # Check both committer email and name
    if commit.committer_email == b"andrew@caramel-code.com" and \
       commit.committer_name == b"Andrew Hewitt":
        commit.committer_email = b"gigaelk@gmail.com"
        commit.committer_name = b"GigaElk"