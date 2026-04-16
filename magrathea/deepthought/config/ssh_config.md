# Deep Thought - Team SSH Configuration
# Created: 2026-04-11

## My SSH Key (for Marvin/Bistromath/Trillian to add)
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJmzDQRI3vYC/4RrxaLTh3t0bNyKY3pKKo255BsgjXAh deepthought

## Teammate SSH Keys (to add to my authorized_keys)

### Trillian
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDdU9PpS2Q0fZ3R5L7mKQ2kN8qP5rT6uV9wX1yZ2a4b trillian

### Marvin
# Pending - need Marvin's public key

### Bistromath  
# Pending - need Bistromath's public key

## SSH Config Template
Host marvin
    HostName 10.0.1.90
    User root
    IdentityFile ~/.ssh/deepthought_ed25519

Host bistromath
    HostName 10.0.1.91
    User admin
    IdentityFile ~/.ssh/deepthought_ed25519

Host trillian
    HostName 10.0.1.92
    User admin
    IdentityFile ~/.ssh/deepthought_ed25519
