from optparse import OptionParser

parser = OptionParser()

parser.add_option("--ns", dest="namespace")
parser.add_option("--src", dest="source_directory")
parser.add_option("--target", dest="target_file")

(options, args) = parser.parse_args()

import os
from os import listdir
from os.path import isfile, join
import re

templates_token = ''.join([options.namespace, '.templates'])
declaration_templates = ''.join([templates_token, ' = {};'])
templates = []

for f in listdir(options.source_directory):
    path_to_file = join(options.source_directory, f)
    if isfile(path_to_file):
        with open(path_to_file, 'r') as template_file:
            template_content = re.sub('\s+', ' ', template_file.read())
            template_name = os.path.splitext(os.path.basename(path_to_file))[0]
            templates.append(''.join(
                [templates_token, "['", template_name, "'] = Mustache.compile('",
                 template_content, "');"]
            ))

string_templates = '\n'.join([declaration_templates, '\n'.join(templates)])
js_file_templates = open(options.target_file, 'w+')
js_file_templates.write(string_templates)
js_file_templates.close()