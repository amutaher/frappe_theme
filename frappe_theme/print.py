class ColorPrint:
    @staticmethod
    def red(text):
        print(f"\033[91m{text}\033[0m")

    @staticmethod
    def green(text):
        print(f"\033[92m{text}\033[0m")

    @staticmethod
    def yellow(text):
        print(f"\033[93m{text}\033[0m")

    @staticmethod
    def blue(text):
        print(f"\033[94m{text}\033[0m")

    @staticmethod
    def magenta(text):
        print(f"\033[95m{text}\033[0m")

    @staticmethod
    def cyan(text):
        print(f"\033[96m{text}\033[0m")

    @staticmethod
    def default(text):
        print(f"\033[0m{text}")
