from boxsdk import OAuth2


def store_tokens(access_token, refresh_token):
    print(f"Access Token: {access_token}, Refresh Token: {refresh_token}")


def authenticate_user(c_id, c_st):
    auth = OAuth2(
        client_id=c_id,
        client_secret=c_st,
        store_tokens=store_tokens,
    )

    auth_url, csrf_token = auth.get_authorization_url('http://localhost/defend/callback')
    print(f"Please visit: {auth_url}")
    csrf_token_in = input("Enter CSRF Token: ")

    if csrf_token_in == csrf_token:
        auth_code = input("Enter Auth Code: ")
        auth.authenticate(auth_code)
    else:
        raise Exception("CSRF Token Mismatch...")


if __name__ == "__main__":
    client_id = input("Enter Client ID: ")
    client_secret = input("Enter Client Secret: ")

    authenticate_user(client_id, client_secret)
