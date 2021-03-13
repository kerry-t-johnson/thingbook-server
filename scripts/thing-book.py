#! /usr/bin/python3

import argparse
from datetime import datetime
import functools
import logging
import os
import requests
import yaml

_INSTANCE = None
_LOGGER = logging.getLogger(os.path.splitext(os.path.basename(__file__))[0])

class ItemNotFoundException(RuntimeError):

    def __init__(self, resource, nameOrId):
        super().__init__('{id} of type {type} not found'.format(id=nameOrId,
                                                                type=resource))


class ItemsCreationDeferredException(RuntimeError):

    def __init__(self, item = None):
        super().__init__()
        self.deferred = []

        if item:
            self.append(item)

    def append(self, item):
        if type(item) is ItemsCreationDeferredException:
            self.deferred.extend(item.deferred)
        else:
            self.deferred.append(item)

    def __bool__(self):
        return len(self.deferred) > 0


class ThingBookAPI(object):

    def __init__(self, url):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.url = url

    def _url(self, resource):
        return '{u}/api/v1/{r}'.format(u=self.url, r=resource)

    def get(self, resource):
        url = self._url(resource)
        response = requests.get(url)
        return response.json()

    def list(self, resource, count=10, offset=0):
        url = self._url(resource)
        response = requests.get(url, {'limit': count, 'offset': offset})
        return response.json()

    def search(self, resource, searchKey, searchValue):
        url = self._url(resource)
        offset = 0
        count = 20
        while True:
            items = self.list(resource, count, offset)

            for i in items:
                if searchValue == i.get(searchKey):
                    return i

            if len(items) < count:
                raise ItemNotFoundException(resource, searchValue)

            offset += count


class _ThingBookEntity(object):

    def __init__(self, resource, data={}, yaml_key = None, name_key = 'name', id_key = '_id', refresh = True):
        self.resource = resource
        self.data = data
        self.yaml_key = yaml_key if yaml_key else self.resource
        self.name_key = name_key
        self.id_key = id_key
        self.refreshed = None
        self.logger = logging.getLogger(self.__class__.__name__)

        if refresh:
            self.refresh()

    def name(self):
        return self.data.get(self.name_key, '<UNKNOWN>')
    
    def id(self):
        return self.data.get(self.id_key)
    
    def log(self, preamble = ''):
        self.logger.info('{p}{s}'.format(p = preamble, s = str(self)))

    def refresh(self):
        try:
            self.logger.debug('Retrieving remote self: {k} = {n}'.format(k = self.name_key, n = self.data[self.name_key]))
            
            remote = _INSTANCE.search(self.resource, self.name_key, self.data[self.name_key])
            self.data.update(remote)
            self.refreshed = datetime.now()

            return True
        except:
            return False

    def _create(self, resource = None):
        try:
            url = _INSTANCE._url(resource if resource else self.resource)
            response = requests.post(url, json=self.data)
            response.raise_for_status()

            remote = response.json()
            self.data.update(remote)
            self.log('Created new ')

            return self
        except requests.exceptions.RequestException as ex:
            if hasattr(ex, 'response'):
                self.logger.error('Server response: ' +
                                  str(ex.response.json()))
            else:
                self.logger.exception(ex)
    
    def __str__(self):
        return '{type}: {id} ({name})'.format(type=self.__class__.__name__.replace('Entity', ''),
                                              id=self.data.get(self.id_key),
                                              name=self.data.get(self.name_key))

class StatusEntity(_ThingBookEntity):
    ''' Represents the most recently retrieved status '''
    def __init__(self, data = {}):
        super().__init__('status', data)

    def refresh(self):
        self.data = _INSTANCE.get(self.resource)
        self.refreshed = datetime.now()

    def __str__(self):
        return '{n}/{v}: {s} (as of {t})'.format(n = self.data['name'],
                                                 v = self.data['version'],
                                                 s = self.data['status'], 
                                                 t = str(self.refreshed))

class UserEntity(_ThingBookEntity):

    def __init__(self, data={}):
        # In the YAML file, we allow the email address to be specified as
        # 'name' in order to be consistent with other types, but here we
        # need to transfer the value over
        data['email'] = data.get('email', data['name'])
        super().__init__('user', data = data, name_key = 'email')

        if not self.refreshed:
            self._create('user/register')
           

class OrganizationEntity(_ThingBookEntity):

    def __init__(self, data={}):
        super().__init__('organization', data = data)

        if not self.refreshed:
            try:
                userEntity = _ENTITY_REPOSITORY.getUser(self.data['user'])
                self._create('user/{u}/organization'.format(u = userEntity.data['_id']))
            except ItemNotFoundException:
                raise ItemsCreationDeferredException(self)

class DataSharingFragment(_ThingBookEntity):

    def __init__(self, data={}):
        super().__init__('data-sharing/fragment', data, yaml_key='ds-fragment')

        if not self.refreshed:
            self._create()


class DataSharingTemplate(_ThingBookEntity):

    def __init__(self, data={}):
        super().__init__('data-sharing/template', data, yaml_key='ds-template')

        if not self.refreshed:
            try:
                self.data['fragments'] = [_ENTITY_REPOSITORY.getDataSharingFragment(f).id() for f in self.data['fragments']]
                self._create()
            except ItemNotFoundException:
                raise ItemsCreationDeferredException(self)


class OrgDataSharingTemplate(_ThingBookEntity):

    def __init__(self, data={}):
        super().__init__('organization/{o}/template', data, yaml_key='org-template', refresh=False)
        try:
            self.data['org'] = _ENTITY_REPOSITORY.getOrganization(self.data['org']).id()
            self.data['template'] = _ENTITY_REPOSITORY.getDataSharingTemplate(self.data['template']).id()
            self.resource = self.resource.format(o = self.data['org'])

            if not self.refresh():
                self._create()
        except ItemNotFoundException:
            raise ItemsCreationDeferredException(self)


class OrgDataSharingAgreement(_ThingBookEntity):

    def __init__(self, data={}):
        super().__init__('organization/{o}/agreement', data, yaml_key='org-agreement', refresh=False)
        try:
            self.data['producer'] = _ENTITY_REPOSITORY.getOrganization(self.data['producer']).id()
            self.data['consumer'] = _ENTITY_REPOSITORY.getOrganization(self.data['consumer']).id()
            self.data['template'] = _ENTITY_REPOSITORY.getOrganizationDataSharingTemplate(self.data['template']).id()
            self.resource = self.resource.format(o = self.data['producer'])

            if not self.refresh():
                self._create()
        except ItemNotFoundException:
            raise ItemsCreationDeferredException(self)


class EntityRepository(object):

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.repo = {
            'user': {},
            'organization': {},
            'ds-fragment': {},
            'ds-template': {},
            'org-template': {},
            'org-agreement': {},
        }
    
    def entityExists(self, type, name):
        return name in self.repo[type]

    def getUser(self, email):
        try:
            return self.repo['user'][email]
        except KeyError:
            raise ItemNotFoundException('user', email)
    
    def getOrganization(self, name):
        try:
            return self.repo['organization'][name]
        except KeyError:
            raise ItemNotFoundException('organization', name)
    
    def getDataSharingFragment(self, name):
        try:
            return self.repo['ds-fragment'][name]
        except KeyError:
            raise ItemNotFoundException('ds-fragment', name)
    
    def getDataSharingTemplate(self, name):
        try:
            return self.repo['ds-template'][name]
        except KeyError:
            raise ItemNotFoundException('ds-template', name)
    
    def getOrganizationDataSharingTemplate(self, name):
        try:
            return self.repo['org-template'][name]
        except KeyError:
            raise ItemNotFoundException('org-template', name)

    def addEntity(self, entity):
        self.logger.debug('{r} "{n}" added to repository'.format(r = entity.yaml_key,
                                                                 n = entity.name()))
        self.repo[entity.yaml_key][entity.name()] = entity

_ENTITY_FACTORIES = {
    'status': StatusEntity,
    'user': UserEntity,
    'organization': OrganizationEntity,
    'ds-fragment': DataSharingFragment,
    'ds-template': DataSharingTemplate,
    'org-template': OrgDataSharingTemplate,
    'org-agreement': OrgDataSharingAgreement,
}

_ENTITY_REPOSITORY = EntityRepository()



def _process_yaml_element(el):
    deferred_elements = ItemsCreationDeferredException()
    if type(el) is dict:
        for yaml_key, value in el.items():
            factory = _ENTITY_FACTORIES.get(yaml_key)
            if factory:
                _LOGGER.debug("Processing '{yaml_key}' entity types...".format(yaml_key=yaml_key))
                for item in value:
                    if not _ENTITY_REPOSITORY.entityExists(yaml_key, item['name']):
                        try:
                            item = factory(data = item)
                            _ENTITY_REPOSITORY.addEntity(item)
                        except ItemsCreationDeferredException as ex:
                            deferred_elements.append(ex)
            else:
                _LOGGER.debug("Recursing into '{yaml_key}' ...".format(yaml_key=yaml_key))
                _process_yaml_element(value)
    if deferred_elements:
        raise deferred_elements

def _cli_status(options):
    status = StatusEntity()
    status.log()

def _cli_yaml(options):
    files_to_process = list(options.yaml)
    num_retries = 0

    while files_to_process and num_retries < 3:
        # NOTE: We make a copy of files_to_process so we can iterate on
        #       the copy and modify the original
        for yaml_file in list(files_to_process):
            _LOGGER.info('{action} YAML file: {file}'.format(action='Processing' if num_retries == 0 else 'Reprocessing',
                                                             file=yaml_file))

            try:
                with open(yaml_file) as stream:
                    data = yaml.safe_load(stream)
                    _process_yaml_element(data)

                # No exceptions, remove this file from the list to be processed
                files_to_process.remove(yaml_file)
            except ItemsCreationDeferredException:
                pass

        num_retries = num_retries + 1


def _cli(entity_type, options):
    _list_helper(entity_type, options)


def _list_helper(type_name, options):
    entity_list = _INSTANCE.list(type_name,
                                 options.count if 'count' in options else 10,
                                 options.offset if 'offset' in options else 0)
    print('{count} {type}'.format(count=len(entity_list),
                                  type=type_name))
    for e in entity_list:
        print('{id:>4}: {name}'.format(id=e['_id'],
                                       name=e.get('name', e.get('email'))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Interact with a SensorThings API instance')

    verbosity_group = parser.add_mutually_exclusive_group()
    verbosity_group.add_argument('-v', '--verbose', action='store_true')
    verbosity_group.add_argument('-s', '--silent', action='store_true')

    parser.add_argument('-d',
                        '--destination',
                        default='http://localhost:8080',
                        help='Specify the SensorThings destination URL')
    parser.add_argument('-r',
                        '--refresh',
                        action='store_true',
                        help='Upon startup, retrieve entities from the server')

    subparsers = parser.add_subparsers()

    status_parser = subparsers.add_parser('status')
    status_parser.set_defaults(func=_cli_status)

    # sensor-things yaml ...
    yaml_parser = subparsers.add_parser('yaml')
    yaml_parser.add_argument('yaml',
                             nargs='+',
                             metavar='YAML',
                             help='Create SensorThings data from the specified YAML file(s).')
    yaml_parser.set_defaults(func=_cli_yaml)

    common_list_options = argparse.ArgumentParser(add_help=False)
    common_list_options.add_argument('-c',
                                     '--count',
                                     default=10,
                                     help='Specify the maximum number of entities to retrieve')
    common_list_options.add_argument('-o',
                                     '--offset',
                                     default=0,
                                     help='Specify an offset for the items to retrieve')

    for entity_type in ['user', 'organization']:
        # e.g.: sensor-things things ...
        things_parser = subparsers.add_parser(entity_type)
        things_parser.set_defaults(func=functools.partial(_cli, entity_type))
        things_subparser = things_parser.add_subparsers()

        # sensor-things things list ...
        things_list_parser = things_subparser.add_parser('list',
                                                         parents=[common_list_options])
        things_list_parser.set_defaults(func=functools.partial(_list_helper, entity_type))

    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.ERROR if args.silent else logging.INFO,
                        format='%(asctime)s [%(levelname)-5s] %(name)-20s %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S')
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    _INSTANCE = ThingBookAPI(args.destination)

    args.func(args)
