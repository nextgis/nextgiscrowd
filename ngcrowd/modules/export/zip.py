from os import listdir, remove
from os.path import isfile, join
from shutil import rmtree

from ngcrowd.helpers import zip_dir

import zipfile


def zip_all(dir):
    for dir_name in listdir(dir):
        dir_full_name = join(dir, dir_name)

        if not isfile(dir_full_name):
            zip = zipfile.ZipFile('%s.zip' % dir_full_name, 'w')

            for file_name in listdir(dir_full_name):
                full_file_name = join(dir_full_name, file_name)
                zip.write(full_file_name, arcname=file_name)

            zip.close()
            rmtree(dir_full_name)