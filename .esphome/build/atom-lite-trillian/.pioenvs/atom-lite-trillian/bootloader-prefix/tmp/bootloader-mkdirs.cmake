# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file LICENSE.rst or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION ${CMAKE_VERSION}) # this file comes with cmake

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "C:/Users/Admin/.platformio/packages/framework-espidf/components/bootloader/subproject")
  file(MAKE_DIRECTORY "C:/Users/Admin/.platformio/packages/framework-espidf/components/bootloader/subproject")
endif()
file(MAKE_DIRECTORY
  "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader"
  "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader-prefix"
  "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader-prefix/tmp"
  "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader-prefix/src/bootloader-stamp"
  "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader-prefix/src"
  "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader-prefix/src/bootloader-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader-prefix/src/bootloader-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "C:/Users/Admin/.openclaw/workspace/.esphome/build/atom-lite-trillian/.pioenvs/atom-lite-trillian/bootloader-prefix/src/bootloader-stamp${cfgdir}") # cfgdir has leading slash
endif()
