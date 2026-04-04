import socket
ports = [0x5247, 0x5248, 0x524A, 0x524B, 0x524C]
for p in ports:
    print(f"Port 0x{p:04X} = {socket.htons(p)}")
